"use client";
import { usePathname } from "next/navigation";
import React from "react";
import styles from "./styles.module.scss";

const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const links = [
    {
      name: "Terapia Cognitivo Comportamental (TCC)",
      href: "/terapia-cognitivo-comportamental",
    },
    { name: "Avaliação Neuropsicológica", href: "/avaliacao-neuropsicologica" },
    {
      name: "Supervisão Clínica em Neuropsicologia",
      href: "/supervisao-clinica",
    },
    { name: "Grupo de Estudos Sou Neuropsi", href: "/grupo-de-estudos" },
    {
      name: "Curso Neuropsi Descomplicada",
      href: "/curso-neuropsi-descomplicada",
    },
    {
      name: "Quero a opinião de um Neurologista",
      href: "/neuro",
    },
    { name: "Contato", href: "/contato" },
  ];

  return (
    <aside className={styles.container}>
      <div className={styles.content}>
        <h2>Serviços Oferecidos</h2>
        {links.map((link, index) => (
          <h5
            key={index}
            onClick={() => (window.location.href = link.href)}
            className={pathname === link.href ? styles.activeLink : ""}
          >
            {link.name}
          </h5>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
