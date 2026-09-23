import Banner from "@/components/Banner";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Profile from "@/components/Profile";
import QuoteSection from "@/components/QuoteSection";
import ServicesGrid from "@/components/ServicesGrid";
import styles from "./page.module.scss"; // Estilos SCSS (será criado depois)

export default function HomePage() {
  return (
    <div className={styles.container}>
      <Header />
      <Banner />
      <div className={styles.Profile}>
        <Profile />
        <div id="services">
          <ServicesGrid />
        </div>
        <QuoteSection />
        <Footer />
      </div>
    </div>
  );
}
