"use client";
import React from "react";
import styles from "./styles.module.scss";

const TCC: React.FC = () => {
  const handleWhatsAppClick = () => {
    window.open(
      "https://wa.me/5585998482733?text=Olá,%20entrei%20em%20contato%20pelo%20site%20e%20gostaria%20de%20saber%20mais%20informações%20sobre%20terapia.",
      "_blank",
      "noopener,noreferrer"
    );
  };
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.banner}>
          <img src="/images/banner1.jpg" alt="" />
        </div>
        <div className={styles.title}>
          <h1>Terapia Cognitivo Comportamental (TCC)</h1>
        </div>
        <div className={styles.text}>
          <p>
            A Terapia Cognitivo-Comportamental (TCC), um método terapêutico
            baseado em evidências que comprovadamente trata uma variedade de
            transtornos de humor e ansiedade, além de levar a uma melhoria
            significativa no funcionamento e na qualidade de vida do indivíduo.
          </p>
          <p>
            É uma modalidade de tratamento psicológico que tem como base a
            premissa de que nossos pensamentos, emoções e comportamentos estão
            todos interligados. Assim, quando cometemos os erros de pensamento,
            ou as chamadas “distorções cognitivas”, às quais todos somos
            suscetíveis, ocorre o sofrimento. A TCC é uma parte importante da
            mudança desse paradigma, auxiliando a lidar com o pensamento
            automático disfuncional do qual talvez nem estejamos cientes - que
            muitas vezes é &ldquo;disfarçado&rdquo; de fato ou verdade.
          </p>
        </div>

        <div className={styles.text}>
          <p>
            Através da TCC, os pacientes aprendem a identificar esses
            pensamentos automáticos, avaliar se seu pensamento reflete com
            precisão a realidade e, se não, empregar uma variedade de técnicas
            para substituí-lo por algo mais construtivo e funcional. Esse
            processo de desenvolver habilidades e modificar os processos
            cognitivos e comportamentais envolve a prática contínua que ocorre
            dentro e fora da sessão. Por esse motivo a TCC é focada na solução
            de problemas, metas e objetivos e pode exigir, a depender de cada
            caso, menos sessões.
          </p>
          <h4>Como funciona:</h4>
          <p>
            As sessões são semanais, excluindo-se os casos que necessitem de
            mais encontros para a eficiência do tratamento. Os horários das
            sessões são fixos, com duração aproximada de 50 minutos cada.
          </p>
          <p>
            A terapia ocorre de forma on-line, sendo este formato aprovado pelo
            Conselho Federal de Psicologia (CFP), possibilitando uma maior
            comodidade e liberdade geográfica. Então basta que você tenha um
            local seguro, privativo e com boa conexão de internet. Podem ser
            realizadas por Notebook ou celular.
          </p>
          <p>
            Em casos nos quais o paciente também seja acompanhado por outros
            profissionais (psiquiatra, neurologista, geriatra, fonoaudiólogos
            etc), havendo permissão do paciente ou responsável, o caso será
            periodicamente discutido com os demais profissionais que o
            acompanham, visando à efetividade e à agilidade no tratamento.
          </p>
        </div>
        <div className={styles.button}>
          <button onClick={handleWhatsAppClick}>
            Quero iniciar minha terapia
          </button>
        </div>
      </div>
    </main>
  );
};

export default TCC;
