import Link from "next/link";
import styles from "./styles.module.scss";

const services = [
  {
    icon: "/icons/users-thin.svg",
    text: "Terapia Cognitivo Comportamental (TCC)",
    description:
      "Iniciar o processo de terapia é um passo importante para atravessar dificuldades emocionais, melhorar relacionamentos e construir uma vida valiosa.",
    link: "/terapia-cognitivo-comportamental",
  },
  {
    icon: "/icons/brain-thin.svg",
    text: "Avaliação Neuropsicológica",
    description: "Só é possível tratar aquilo que eu sei o que é.",
    link: "/avaliacao-neuropsicologica",
  },
  {
    icon: "/icons/mindset.png",
    text: "Supervisão Clínica em Neuropsicologia",
    description: "Raciocínio clínico: é diferente pensar juntos.",
    link: "/supervisao-clinica",
  },
  {
    icon: "/icons/book.png",
    text: "Grupo de Estudos Sou Neuropsi",
    description: "Em construção.",
    link: "/grupo-de-estudos",
  },
  {
    icon: "/icons/thinking.png",
    text: "Curso Neuropsi Descomplicada",
    description: "Sem travas no raciocínio clínico.",
    link: "/curso-neuropsi-descomplicada",
  },
  {
    icon: "/icons/doctor.png",
    text: "Quero a opinião de um Neurologista.",
    link: "/neuro",
  },
];

const ServicesGrid = () => {
  return (
    <section className={styles.servicesSection}>
      <div className={styles.container}>
        <div className={styles.title}>
          <h2>Atuações e Atendimentos</h2>
        </div>
        <div className={styles.grid}>
          {services.map((service, index) => (
            <div key={index} className={styles.card}>
              <img
                src={service.icon}
                alt="Service Icon"
                className={styles.icon}
              />

              <p>{service.text}</p>
              <h5>{service.description}</h5>
              <Link href={service.link} passHref>
                <button className={styles.button}>Conheça Mais</button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
