import React from "react";

import GDE from "@/components/Grupo de Estudos";
import HeaderService from "@/components/HeaderService";
import Sidebar from "@/components/Sidebar";
import styles from "./styles.module.scss";

const GrupoDeEstudos: React.FC = () => {
  return (
    <div className={styles.container}>
      <HeaderService />
      <div className={styles.content}>
        <Sidebar />
        <GDE />
      </div>
    </div>
  );
};

export default GrupoDeEstudos;
