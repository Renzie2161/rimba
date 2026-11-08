import { spawn } from "node:child_process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Piped psql stdout is fully buffered on Windows, so coordination uses
// pg_stat_activity (idle-in-transaction and blocking-pid signals) instead.
function launch(port, environment, appName, keepStdin) {
  const child = spawn(
    "psql",
    [
      "-X",
      "-w",
      "-h",
      "::1",
      "-p",
      port,
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    {
      env: { ...environment, PGAPPNAME: appName },
      stdio: [keepStdin ? "pipe" : "ignore", "ignore", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const closed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stderr }));
  });
  return { child, closed, getStderr: () => stderr };
}

async function waitForIdleTxn(psql, appName, label) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const found = psql(
      `select 'READY' where exists (select 1 from pg_stat_activity where application_name='${appName}' and state='idle in transaction')`,
    );
    if (found.includes("READY")) return;
    await sleep(500);
  }
  const snapshot = psql(
    `select coalesce(application_name,'?') || ':' || state from pg_stat_activity where datname='postgres';`,
  );
  throw new Error(`Timed out waiting for ${label}; snapshot=${snapshot}`);
}

export async function verifyConcurrentMutations(port, environment, psql) {
  // New libpq connections stall ~15s on GSS negotiation on this host; disable it.
  environment.PGGSSENCMODE = "disable";
  const admin =
    "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';";
  const curator =
    "set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';";
  const campaignId = "30000000-0000-0000-0000-000000000001";
  const sourceId = "20000000-0000-0000-0000-000000000003";
  console.log("concurrency: staging fixtures");
  psql(`insert into public.campaigns(id,slug) values ('${campaignId}','concurrency-fixture');
    insert into public.campaign_translations(campaign_id,locale,title,summary,body,translation_status)
      values ('${campaignId}','id','Fixture','Fixture summary','Fixture body','published');
    insert into public.sources(id,title,organization,url,accessed_on)
      values ('${sourceId}','Unlinked source','Fixture','https://example.org/concurrent',current_date);`);

  async function blockedMutation(name, firstSql, secondSql, expected, message) {
    const first = launch(port, environment, `rimba-first-${name}`, true);
    const second = launch(port, environment, `rimba-second-${name}`, true);
    try {
      // No shell escapes: hold the transaction open, then detect it via pg_stat_activity.
      first.child.stdin.write(`${firstSql}\n`);
      await waitForIdleTxn(
        psql,
        `rimba-first-${name}`,
        `${name} first transaction`,
      );
      // Second session runs async so the loop stays free to observe locks.
      const secondExit = new Promise((resolve, reject) => {
        second.child.once("error", reject);
        second.child.once("close", (code) =>
          resolve({ code, stderr: second.getStderr() }),
        );
      });
      second.child.stdin?.end(`begin; ${secondSql}; commit;\n`);
      if (expected === "noop") {
        // No blocking expected: RLS filters the row before any lock is taken.
        const resultB = await secondExit;
        if (resultB.code !== 0) throw new Error(resultB.stderr);
        first.child.stdin.end("commit;\n");
        const resultA = await first.closed;
        if (resultA.code !== 0) throw new Error(resultA.stderr);
        return;
      }
      // Race lock observation against an early second-session exit for diagnosis.
      const deadline = Date.now() + 100000;
      let observed = false;
      let secondDone = false;
      let secondResult = null;
      secondExit.then((result) => {
        secondDone = true;
        secondResult = result;
      });
      while (Date.now() < deadline && !observed && !secondDone) {
        await sleep(200);
        if (second.child.exitCode !== null) break;
        observed = psql(
          `select case when exists (select 1 from pg_stat_activity
            where application_name='rimba-second-${name}'
            and cardinality(pg_blocking_pids(pid)) > 0) then 'BLOCKED' else (
            select coalesce(string_agg(state || ':' || coalesce(wait_event_type, 'cpu'), ','), 'absent')
            from pg_stat_activity where application_name='rimba-second-${name}') end;`,
        ).includes("BLOCKED");
      }
      if (!observed) {
        const snapshot = psql(
          `select pid || ':' || coalesce(application_name,'?') || ':' || state || ':' || coalesce(wait_event_type,'cpu')
            from pg_stat_activity where datname='postgres';`,
        );
        throw new Error(
          `Lock wait not observed (second exited: ${secondDone} code=${secondResult?.code} stderr=${secondResult?.stderr} snapshot=${snapshot})`,
        );
      }
      first.child.stdin.end("commit;\n");
      const resultA = await first.closed;
      if (resultA.code !== 0) throw new Error(resultA.stderr);
      const resultB = await secondExit;
      if (expected === "rejected") {
        if (resultB.code === 0)
          throw new Error(
            `Expected rejected concurrent mutation: ${resultB.stderr}`,
          );
        if (message && !resultB.stderr.includes(message))
          throw new Error(
            `Expected concurrent rejection (${message}): ${resultB.stderr}`,
          );
      } else if (expected === "serialized") {
        if (resultB.code !== 0) throw new Error(resultB.stderr);
      } else {
        throw new Error("Unknown concurrent expectation");
      }
    } finally {
      for (const child of [first.child, second.child])
        if (child.exitCode === null) child.kill();
    }
  }

  // A publishes while holding parent locks, so B must wait and then revalidate.
  console.log("concurrency: campaign-delete start");
  await blockedMutation(
    "campaign-delete",
    `${admin} begin; update public.campaigns set status='published' where id='${campaignId}'; set constraints all immediate;`,
    `${admin} delete from public.campaign_translations where campaign_id='${campaignId}'`,
    "rejected",
    "Campaign publication requires complete Indonesian content",
  );
  psql(
    `do $$ begin if not exists (select 1 from public.campaign_translations where campaign_id='${campaignId}') then raise exception 'Concurrent campaign translation deletion committed'; end if; end $$;`,
  );

  // Pending curator edit blocks linkage, then stays linked after both commit.
  console.log("concurrency: source-link start");
  await blockedMutation(
    "source-link",
    `${curator} begin; update public.sources set title='Curator edit before publication' where id='${sourceId}';`,
    `${admin} insert into public.species_sources(species_id,source_id) values ('10000000-0000-0000-0000-000000000001','${sourceId}')`,
    "serialized",
  );
  psql(
    `do $$ begin if not public.source_is_public('${sourceId}') or not exists (select 1 from public.sources where id='${sourceId}' and title='Curator edit before publication') then raise exception 'Source linkage serialization failed'; end if; end $$;`,
  );

  // Reverse order: RLS silently drops curator edits on already-public sources.
  await blockedMutation(
    "source-edit",
    `${admin} begin; insert into public.conservation_assessments(species_id,status_code,source_id) values ('10000000-0000-0000-0000-000000000001','LC','${sourceId}');`,
    `${curator} update public.sources set title='Late curator edit' where id='${sourceId}'`,
    "noop",
  );
  psql(
    `do $$ begin if exists (select 1 from public.sources where id='${sourceId}' and title='Late curator edit') then raise exception 'Curator edit reached a public source'; end if; end $$;`,
  );

  // Reverse serialization: pending link creation blocks a later curator edit
  // on a still-unlinked source, then both commit without losing the edit.
  const freshSource = "20000000-0000-0000-0000-000000000004";
  psql(
    `insert into public.sources(id,title,organization,url,accessed_on)
      values ('${freshSource}','Unlinked reverse fixture','Fixture','https://example.org/reverse-concurrent',current_date);`,
  );
  console.log("concurrency: source-link-reverse start");
  await blockedMutation(
    "source-link-reverse",
    `${curator} begin; update public.sources set title='Curator edit before reverse link' where id='${freshSource}';`,
    `${admin} insert into public.species_sources(species_id,source_id) values ('10000000-0000-0000-0000-000000000001','${freshSource}')`,
    "serialized",
  );
  psql(
    `do $$ begin if not public.source_is_public('${freshSource}') or not exists (select 1 from public.sources where id='${freshSource}' and title='Curator edit before reverse link') then raise exception 'Reverse linkage serialization failed'; end if; end $$;`,
  );
  console.log(
    "PASS: concurrent campaign publication/deletion and source-edit/link serialization",
  );
}
