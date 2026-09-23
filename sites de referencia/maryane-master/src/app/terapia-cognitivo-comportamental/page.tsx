import React from "react";

import HeaderService from "@/components/HeaderService";
import Sidebar from "@/components/Sidebar";
import TCC from "@/components/TCC";
import styles from "./styles.module.scss";

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <HeaderService />
      </div>
      <div className={styles.content}>
        <Sidebar />

        <div className={styles.tcc}>
          <TCC />
        </div>
      </div>
    </div>
  );
};

export default Home;
