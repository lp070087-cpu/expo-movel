import React from "react";
import styles from "./styles.module.scss";

const Banner = () => {
  return (
    <section className={styles.banner}>
      <div className={styles.container}></div>
      <video autoPlay muted loop className={styles.imageContent}>
        <source src="/videos/banner.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </section>
  );
};

export default Banner;
