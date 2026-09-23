"use client";

import React from "react";
import styles from "../TCC/styles.module.scss";

const GDE: React.FC = () => {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.bannerNeuro}>
          <img src="/images/cerebelo.webp" alt="" />
        </div>
        <div className={styles.title}>
          <h1>Grupo de Estudos Sou Neuropsi</h1>
        </div>
        <div className={styles.text}>
          <p>
            O grupo de Estudos Sou Neuropsi está sendo preparado com muito
            carinho. Em breve mais informações.
          </p>
        </div>
      </div>
    </main>
  );
};

export default GDE;
