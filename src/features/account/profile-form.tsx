"use client";
import { useActionState } from "react";
import { saveProfile } from "./actions";
import { usernameUnlockAt, type Profile } from "./schemas";
import styles from "./profile.module.css";

export default function ProfileForm({
  profile,
  onboarding = false,
  now,
}: {
  profile: Profile;
  onboarding?: boolean;
  now: number;
}) {
  const [state, action, pending] = useActionState(saveProfile, { error: "" });
  const unlock = usernameUnlockAt(profile.username_changed_at);
  const locked = Boolean(unlock && unlock.getTime() > now);
  const unlockLabel = unlock?.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "short",
  });
  return (
    <form action={action} className={styles.form}>
      <fieldset disabled={pending}>
        <label htmlFor="display_name">Nama tampilan</label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name}
          required
          maxLength={80}
          autoComplete="name"
        />
        <label htmlFor="username">Username</label>
        <div className={styles.usernameInput}>
          <span aria-hidden="true">@</span>
          <input
            id="username"
            name="username"
            defaultValue={profile.username ?? ""}
            required
            minLength={3}
            maxLength={24}
            pattern="[a-z][a-z0-9_]{2,23}"
            readOnly={locked}
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            aria-describedby="username-help"
          />
        </div>
        <p id="username-help" className={styles.help}>
          {locked
            ? `Dapat diubah kembali pada ${unlockLabel} WIB.`
            : "3–24 huruf kecil, angka, atau garis bawah. Awali dengan huruf. Setelah disimpan, username terkunci selama 7 hari."}
        </p>
        {!onboarding ? (
          <>
            <label htmlFor="location">
              Lokasi <span>(opsional)</span>
            </label>
            <input
              id="location"
              name="location"
              defaultValue={profile.location}
              maxLength={120}
              placeholder="Kota, negara"
            />
            <label htmlFor="bio">
              Tentang saya <span>(opsional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio}
              maxLength={300}
              rows={4}
              placeholder="Ceritakan ketertarikanmu pada alam."
            />
          </>
        ) : (
          <>
            <input type="hidden" name="location" value={profile.location} />
            <input type="hidden" name="bio" value={profile.bio} />
          </>
        )}
        {state.error ? (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        ) : null}
        <button className={styles.primary} type="submit">
          {pending
            ? "Menyimpan…"
            : onboarding
              ? "Mulai menjelajah"
              : "Simpan perubahan"}
        </button>
      </fieldset>
    </form>
  );
}
