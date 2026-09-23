import React from "react";
import styles from "./styles.module.scss";

const LinkTree: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.profile}>
        <img
          src="/path/to/your-profile-image.jpg"
          alt="Profile"
          className={styles.profilePic}
        />
        <h1>Alana da Silva Luiz Anijar</h1>
        <p>CRP 06/185942</p>
      </div>
      <div className={styles.links}>
        <a href="#" className={styles.linkButton}>
          FAÇA TERAPIA NA MINHA CLÍNICA
        </a>
        <a href="#" className={styles.linkButton}>
          EP. NOVO VEM ASSISTIR
        </a>
        <a href="#" className={styles.linkButton}>
          LIVRO PSICOLOGIA NA PRÁTICA
        </a>
        <a href="#" className={styles.linkButton}>
          PODCAST - PSICOLOGIA NA PRÁTICA
        </a>
        <a href="#" className={styles.linkButton}>
          PALESTRAS, CONVITES E PARCERIAS
        </a>
        <a href="#" className={styles.linkButton}>
          TIKTOK
        </a>
      </div>
    </div>
  );
};

export default LinkTree;
