import type { AccountActivity, Profile } from "./schemas";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/features/account/actions";
import styles from "@/features/account/profile.module.css";

const activityDateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default function ProfileContent({
  profile,
  activities,
  activitiesUnavailable = false,
  email,
  tab: selectedTab,
  saved,
  error,
}: {
  profile: Profile;
  activities: AccountActivity[];
  activitiesUnavailable?: boolean;
  email?: string;
  tab?: string;
  saved?: string;
  error?: string;
}) {
  const p = profile;
  const params = { tab: selectedTab, saved, error };
  const tab = ["collection", "achievements"].includes(params.tab ?? "")
    ? params.tab
    : "activity";
  const name = p.display_name || p.username!;
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase("id-ID");
  return (
    <main className={styles.page} id="main">
      <p className={styles.eyebrow}>Profil saya</p>
      {params.saved === "1" ? (
        <p role="status" className={styles.notice}>
          Profil berhasil disimpan.
        </p>
      ) : null}
      {params.error ? (
        <p role="alert" className={styles.error}>
          Belum berhasil keluar dari akun. Silakan coba lagi.
        </p>
      ) : null}
      <header className={styles.hero}>
        <span className={styles.avatar} aria-hidden="true">
          {initials}
        </span>
        <div className={styles.identity}>
          <p className={styles.role}>Penjelajah alam</p>
          <h1>{name}</h1>
          <p>
            @{p.username}
            {p.location ? ` · ${p.location}` : ""}
          </p>
          <p>{p.bio || "Mengenal alam, melindungi lebih baik."}</p>
        </div>
        <Link className={styles.edit} href="/profile/edit">
          Edit profil
        </Link>
      </header>
      <div className={styles.metrics} aria-label="Ringkasan penjelajahan">
        {[
          "Spesies teridentifikasi",
          "Dilindungi / langka",
          "Entri jurnal pribadi",
          "Lencana diraih",
        ].map((label) => (
          <div className={styles.metric} key={label}>
            <strong aria-label="Belum tersedia">—</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <nav className={styles.tabs} aria-label="Bagian profil">
        {[
          { id: "activity", label: "Aktivitas" },
          { id: "collection", label: "Koleksi" },
          { id: "achievements", label: "Pencapaian" },
        ].map((item) => (
          <Link
            key={item.id}
            href={`/profile?tab=${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2>
            {tab === "collection"
              ? "Koleksi saya"
              : tab === "achievements"
                ? "Pencapaian saya"
                : "Aktivitas terbaru"}
          </h2>
          {tab === "activity" && activitiesUnavailable ? (
            <p className={styles.error} role="alert">
              Aktivitas terbaru belum dapat dimuat saat ini.
            </p>
          ) : tab === "activity" && activities.length > 0 ? (
            <ol
              aria-label="Aktivitas spesies terbaru"
              className={styles.activityList}
            >
              {activities.map((activity) => (
                <li className={styles.activityItem} key={activity.id}>
                  <div className={styles.activityContent}>
                    <p className={styles.activityDescription}>
                      {activity.type === "identified"
                        ? "Berhasil mengidentifikasi"
                        : "Melihat detail"}{" "}
                      <Link
                        className={styles.activitySpecies}
                        href={`/species/${activity.speciesSlug}`}
                      >
                        {activity.speciesCommonName}
                      </Link>
                    </p>
                    <p className={styles.activityScientificName}>
                      <em>{activity.speciesScientificName}</em>
                    </p>
                  </div>
                  <time
                    className={styles.activityTime}
                    dateTime={activity.occurredAt}
                  >
                    {activityDateFormat.format(new Date(activity.occurredAt))}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>
              <BookOpen size={26} strokeWidth={1.5} aria-hidden="true" />
              <p>
                {tab === "collection"
                  ? "Koleksi pribadi belum tersedia."
                  : tab === "achievements"
                    ? "Belum ada pencapaian yang tercatat."
                    : "Aktivitas penjelajahan pribadi belum tersedia. Kamu tetap dapat mengenal spesies di ensiklopedia."}
              </p>
              <Link className={styles.exploreButton} href="/species">
                Jelajahi ensiklopedia
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2>Lencana</h2>
            <Leaf
              size={23}
              strokeWidth={1.5}
              color="var(--brand-600)"
              aria-hidden="true"
            />
            <p>
              Belum ada lencana yang diraih. Perjalanan mengenal alam baru
              dimulai.
            </p>
          </section>
          <section className={styles.panel} aria-label="Pengaturan akun">
            <details>
              <summary className={styles.setting}>
                Notifikasi <ChevronRight size={15} aria-hidden="true" />
              </summary>
              <p>Belum ada notifikasi untuk akunmu.</p>
            </details>
            <details>
              <summary className={styles.setting}>
                Privasi & keamanan <ShieldCheck size={15} aria-hidden="true" />
              </summary>
              <p>
                Profilmu hanya dapat diakses oleh akunmu. Login dikelola melalui
                Google. Username dapat diubah setiap 7 hari.
              </p>
              <p>{email}</p>
            </details>
            <form action={signOut}>
              <button className={styles.logout} type="submit">
                Keluar <ChevronRight size={15} aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
