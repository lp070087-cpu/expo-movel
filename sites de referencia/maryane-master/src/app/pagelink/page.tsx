import styles from "./styles.module.scss";

const services = [
  {
    text: "Terapia Cognitivo Comportamental (TCC)",
    link: "/terapia-cognitivo-comportamental",
  },
  {
    text: "Avaliação Neuropsicológica",
    link: "/avaliacao-neuropsicologica",
  },
  {
    text: "Supervisão Clínica em Neuropsicologia",
    link: "/supervisao-clinica",
  },
  {
    text: "Grupo de Estudos Sou Neuropsi",
    link: "/grupo-de-estudos",
  },
  {
    text: "Curso Neuropsi Descomplicada",
    link: "/curso-neuropsi-descomplicada",
  },
  {
    text: "Quero a opinião de um Neurologista.",
    link: "/neuro",
  },
];
export default function PageLink() {
  return (
    <div className={styles.container}>
      <video autoPlay muted loop className={styles.imageContent}>
        <source src="/videos/banner.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className={styles.profile}>
        <img
          src="/images/profile.png"
          alt="Profile"
          className={styles.profilePic}
        />
        <h1>Maryane Mendes Cavalcanti Damasceno</h1>
        <p>CRP 11/10624</p>
      </div>
      <div className={styles.links}>
        {services.map((service, index) => (
          <a
            key={index}
            href={service.link}
            className={styles.linkButton}
            target="_blank"
            rel="noopener noreferrer"
          >
            {service.text}
          </a>
        ))}
      </div>
    </div>
  );
}
