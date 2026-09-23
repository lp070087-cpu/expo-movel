import React from "react";

import HeaderService from "@/components/HeaderService";
import SCEN from "@/components/SCEN";
import Sidebar from "@/components/Sidebar";
import styles from "./styles.module.scss";

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <HeaderService />
      <div className={styles.content}>
        <Sidebar />
        <SCEN />
      </div>
    </div>
  );
};

export default Home;
