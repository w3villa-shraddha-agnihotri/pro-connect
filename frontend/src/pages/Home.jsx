import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HeroSection from "../components/home/HeroSection";
import ServicesSection from "../components/home/ServicesSection";
import HowItWorks from "../components/home/HowItWorks";

function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const scrollToElement = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      };

      scrollToElement();
      const timer = setTimeout(scrollToElement, 100);
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <HowItWorks />
      </main>

      <Footer />
    </>
  );
}

export default Home;