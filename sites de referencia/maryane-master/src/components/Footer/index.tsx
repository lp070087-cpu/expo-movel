import Link from "next/link";
import styles from "./styles.module.scss";

const Footer = () => {
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=equipe.maryanecavalcanti@gmail.com`;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerColumn}>
          <h3>Maryane Cavalcanti</h3>
          <p>
            Clínica Venitá Av. Dom Luís, nº 500, sala 1716, Aldeota, Torre
            Comercial do Shopping Aldeota
          </p>
          <p>Fortaleza - CE</p>
          <p>
            <Link href={gmailLink} passHref>
              equipe.maryanecavalcanti@gmail.com
            </Link>
          </p>
          <p>
            Tel/WhatsApp:
            <a
              href="https://wa.me/5585998482733"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>(85) 99848.2733</strong>
            </a>
          </p>
        </div>

        <div className={styles.footerColumn}>
          <h3>Social</h3>
          <ul>
            {/* <li>
              <a href="#">LinkedIn</a>
            </li>
            <li>
              <a href="#">Facebook </a>
            </li> */}
            <li>
              <Link
                href="https://www.instagram.com/maryanecavalcanti_/"
                passHref
              >
                Instagram
              </Link>
            </li>
          </ul>
        </div>

        <div className={styles.footerColumn}>
          <h3>Navegação</h3>
          <ul>
            <li>
              <Link href="/" passHref>
                Home
              </Link>
            </li>
            <li>
              <Link href="/terapia-cognitivo-comportamental" passHref>
                Áreas de Interesse
              </Link>
            </li>
            <li>
              <Link href="/contato">Contato</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        {/* <p>Site desenvolvido pela Solid Tech © 2024</p> */}
      </div>
    </footer>
  );
};

export default Footer;
