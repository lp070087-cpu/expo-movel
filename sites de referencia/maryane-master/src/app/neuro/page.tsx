import React from "react";

import HeaderService from "@/components/HeaderService";
import Neuro from "@/components/Neuro";
import Sidebar from "@/components/Sidebar";
import styles from "./styles.module.scss";

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <HeaderService />
      <div className={styles.content}>
        <Sidebar />
        <Neuro />
      </div>
    </div>
  );
};

export default Home;
