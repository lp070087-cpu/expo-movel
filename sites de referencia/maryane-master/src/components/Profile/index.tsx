// components/Profile.tsx
import styles from "./styles.module.scss";

const Profile = () => {
  return (
    <section className={styles.profile}>
      <div className={styles.content}>
        <div className={styles.imageContainer}>
          <img src="/images/profile.png" alt="Maryane Cavalcanti" />
        </div>
        <div className={styles.info}>
          <h1>Maryane Mendes Cavalcanti Damasceno</h1>
          <p className={styles.crp}>CRP 11/10624</p>
          <p className={styles.description}>
            Psicóloga, neuropsicóloga, professora e mentora. Com mais de 9 anos
            de experiência, Maryane é mestre em Ciências (na área de Neurologia)
            pela Universidade Federal de São Paulo (Unifesp - EPM), especialista
            em Neuropsicologia pela Unichristus (CE), especialista em Terapia
            Cognitivo Comportamental pelo CTC Veda (SP) e certificada em
            Neuropsicologia pela Sociedade Brasileira de Neuropsicologia (SBNp -
            2021).
          </p>
          <p className={styles.description}>
            Foi curadora do currículo pedagógico da Pós-Graduação em
            Neuropsicologia da Universidade de Fortaleza (Unifor) e atualmente é
            professora convidada das pós-graduações em Neuropsicologia do
            Instituto Israelita Albert Einstein (SP), Unichristus (CE), IBAC
            (DF) e Unifor.
          </p>
          <p className={styles.description}>
            Além disso, atua com supervisões, avaliações neuropsicológicas e
            terapia cognitivo comportamental no consultório particular.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Profile;
