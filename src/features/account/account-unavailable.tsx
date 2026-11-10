import { Link } from "@/i18n/navigation";
import { signOut } from "./actions";
import styles from "./profile.module.css";

export default function AccountUnavailable() {
  return (
    <main className={styles.formPage} id="main">
      <h1>Profil belum dapat dimuat.</h1>
      <p role="alert">
        Data akun sementara tidak tersedia. Coba lagi untuk melanjutkan.
      </p>
      <Link className={styles.exploreButton} href="/profile">
        Coba lagi
      </Link>
      <form action={signOut}>
        <button className={styles.logout} type="submit">
          Keluar dari akun
        </button>
      </form>
    </main>
  );
}
