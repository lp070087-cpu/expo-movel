"use client";

import Link from "next/link";
import React, { FormEvent, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./styles.module.scss";

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    advice: "",
    budget: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Start loading

    try {
      const response = await fetch("/api/contactForm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Formulário enviado com sucesso!");
        setFormData({
          name: "",
          email: "",
          phone: "",
          advice: "",
          budget: "",
          message: "",
        }); // Clear form
      } else {
        toast.error("Falha ao enviar o formulário.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Erro ao enviar o formulário.");
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleWhatsAppClick = () => {
    // Impede o comportamento padrão do Link
    window.open("https://wa.me/5585998482733", "_blank", "noopener,noreferrer");
  };

  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=equipe.maryanecavalcanti@gmail.com`;

  return (
    <div className={styles.background}>
      <div className={styles.contactContainer}>
        <div className={styles.contactText}>
          <h2>Vamos Conversar</h2>
          <p>
            Precisa de apoio psicológico ou, como psicólogo, deseja lapidar os
            seus conhecimentos em Neuropsicologia? Estou aqui para ajudar! Entre
            em contato com minha equipe e conte-nos um pouco sobre você.
            Adoraríamos entender como podemos colaborar para que você alcance
            seus objetivos.
          </p>

          <h3>Email</h3>
          <Link href={gmailLink}>
            <p>equipe.maryanecavalcanti@gmail.com</p>
          </Link>
          <Link href="https://www.instagram.com/maryanecavalcanti_/" passHref>
            <p>Instagram</p>
          </Link>

          <button
            onClick={handleWhatsAppClick}
            className={styles.whatsappButton}
          >
            Entre em contato pelo WhatsApp
          </button>
        </div>

        {/* Form */}
        <form className={styles.contactForm} onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Telefone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          {/* <select
            name="advice"
            value={formData.advice}
            onChange={handleChange}
            required
          >
            <option value="">
              Qual tipo de orientação você está buscando?
            </option>
            <option value="Consulta">Consulta</option>
          </select>
          <select
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            required
          >
            <option value="">Selecione o Tipo da Consulta</option>
            <option value="Terapia Cognitiva">Terapia Cognitiva</option>
          </select> */}
          <textarea
            name="message"
            placeholder="Mensagem..."
            value={formData.message}
            onChange={handleChange}
            rows={4}
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? <span className={styles.spinner}></span> : "Enviar"}
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
};

export default ContactForm;
