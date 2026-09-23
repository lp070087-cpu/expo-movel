import Footer from "@/components/Footer";

import HeaderService from "@/components/HeaderService";
import styles from "./styles.module.scss";
import ContactForm from "@/components/ContactForm";

export default function HomePage() {
  return (
    <div className={styles.container}>
      <HeaderService />
      <ContactForm />
      <Footer />
    </div>
  );
}
