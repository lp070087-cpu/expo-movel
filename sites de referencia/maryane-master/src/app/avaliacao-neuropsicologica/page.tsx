import React from "react";

import AN from "@/components/AN";
import HeaderService from "@/components/HeaderService";
import Sidebar from "@/components/Sidebar";
import styles from "./styles.module.scss";

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <HeaderService />
      <div className={styles.content}>
        <Sidebar />
        <AN />
      </div>
    </div>
  );
};

export default Home;
