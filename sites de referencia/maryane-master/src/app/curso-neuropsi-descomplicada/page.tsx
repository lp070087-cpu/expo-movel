import React from "react";

import CND from "@/components/CND";
import HeaderService from "@/components/HeaderService";
import Sidebar from "@/components/Sidebar";
import styles from "./styles.module.scss";

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <HeaderService />
      <div className={styles.content}>
        <Sidebar />

        <div className={styles.cnd}>
          <CND />
        </div>
      </div>
    </div>
  );
};

export default Home;
