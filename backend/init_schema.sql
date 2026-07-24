--
-- PostgreSQL database dump
--

\restrict tBgdS1bCXBF26gPHE80IYLF48oFwZgNP0waXAKwSZPVuzS9Ez1pHzt85S78PuHd

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: examenes; Type: TABLE; Schema: public; Owner: docentesmart
--

CREATE TABLE public.examenes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    titulo character varying(255) NOT NULL,
    codigo_cuadernillo character varying(100) NOT NULL,
    descripcion text,
    nivel character varying(50) NOT NULL,
    tipo character varying(50) DEFAULT 'nombramiento'::character varying NOT NULL,
    anio integer NOT NULL,
    total_preguntas integer DEFAULT 60 NOT NULL,
    duracion_minutos integer DEFAULT 180 NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT examenes_nivel_check CHECK (((nivel)::text = ANY ((ARRAY['inicial'::character varying, 'primaria'::character varying])::text[]))),
    CONSTRAINT examenes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['nombramiento'::character varying, 'ascenso'::character varying])::text[])))
);


ALTER TABLE public.examenes OWNER TO docentesmart;

--
-- Name: intento_respuestas; Type: TABLE; Schema: public; Owner: docentesmart
--

CREATE TABLE public.intento_respuestas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    intento_id uuid,
    pregunta_id uuid,
    opcion_seleccionada_id uuid,
    es_correcta boolean NOT NULL,
    respondido_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.intento_respuestas OWNER TO docentesmart;

--
-- Name: intentos; Type: TABLE; Schema: public; Owner: docentesmart
--

CREATE TABLE public.intentos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid,
    examen_id uuid,
    modo character varying(50) DEFAULT 'simulacro'::character varying NOT NULL,
    puntaje numeric(5,2) DEFAULT 0.00,
    total_preguntas integer NOT NULL,
    preguntas_correctas integer DEFAULT 0,
    preguntas_incorrectas integer DEFAULT 0,
    estado character varying(50) DEFAULT 'en_progreso'::character varying,
    iniciado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    finalizado_en timestamp with time zone,
    CONSTRAINT intentos_estado_check CHECK (((estado)::text = ANY ((ARRAY['en_progreso'::character varying, 'completado'::character varying])::text[]))),
    CONSTRAINT intentos_modo_check CHECK (((modo)::text = ANY ((ARRAY['practica'::character varying, 'simulacro'::character varying])::text[])))
);


ALTER TABLE public.intentos OWNER TO docentesmart;

--
-- Name: opciones; Type: TABLE; Schema: public; Owner: docentesmart
--

CREATE TABLE public.opciones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pregunta_id uuid,
    etiqueta character varying(10) NOT NULL,
    texto_opcion text NOT NULL,
    es_correcta boolean DEFAULT false NOT NULL
);


ALTER TABLE public.opciones OWNER TO docentesmart;

--
-- Name: preguntas; Type: TABLE; Schema: public; Owner: docentesmart
--

CREATE TABLE public.preguntas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    examen_id uuid,
    numero_pregunta integer NOT NULL,
    texto_pregunta text NOT NULL,
    url_imagen text,
    explicacion text,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.preguntas OWNER TO docentesmart;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: docentesmart
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    correo character varying(255) NOT NULL,
    contrasena_hash character varying(255) NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    rol character varying(50) DEFAULT 'usuario'::character varying,
    suscripcion_hasta timestamp with time zone,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['usuario'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO docentesmart;

--
-- Name: examenes examenes_codigo_cuadernillo_key; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.examenes
    ADD CONSTRAINT examenes_codigo_cuadernillo_key UNIQUE (codigo_cuadernillo);


--
-- Name: examenes examenes_pkey; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.examenes
    ADD CONSTRAINT examenes_pkey PRIMARY KEY (id);


--
-- Name: intento_respuestas intento_respuestas_pkey; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intento_respuestas
    ADD CONSTRAINT intento_respuestas_pkey PRIMARY KEY (id);


--
-- Name: intentos intentos_pkey; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intentos
    ADD CONSTRAINT intentos_pkey PRIMARY KEY (id);


--
-- Name: opciones opciones_pkey; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.opciones
    ADD CONSTRAINT opciones_pkey PRIMARY KEY (id);


--
-- Name: preguntas preguntas_pkey; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_pkey PRIMARY KEY (id);


--
-- Name: opciones unique_etiqueta_por_pregunta; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.opciones
    ADD CONSTRAINT unique_etiqueta_por_pregunta UNIQUE (pregunta_id, etiqueta);


--
-- Name: intento_respuestas unique_intento_pregunta; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intento_respuestas
    ADD CONSTRAINT unique_intento_pregunta UNIQUE (intento_id, pregunta_id);


--
-- Name: preguntas unique_pregunta_por_examen; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT unique_pregunta_por_examen UNIQUE (examen_id, numero_pregunta);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_examenes_filtro; Type: INDEX; Schema: public; Owner: docentesmart
--

CREATE INDEX idx_examenes_filtro ON public.examenes USING btree (nivel, tipo, anio);


--
-- Name: idx_intento_respuestas_intento; Type: INDEX; Schema: public; Owner: docentesmart
--

CREATE INDEX idx_intento_respuestas_intento ON public.intento_respuestas USING btree (intento_id);


--
-- Name: idx_intentos_usuario_estado; Type: INDEX; Schema: public; Owner: docentesmart
--

CREATE INDEX idx_intentos_usuario_estado ON public.intentos USING btree (usuario_id, estado);


--
-- Name: idx_opciones_pregunta; Type: INDEX; Schema: public; Owner: docentesmart
--

CREATE INDEX idx_opciones_pregunta ON public.opciones USING btree (pregunta_id);


--
-- Name: idx_preguntas_examen; Type: INDEX; Schema: public; Owner: docentesmart
--

CREATE INDEX idx_preguntas_examen ON public.preguntas USING btree (examen_id);


--
-- Name: intento_respuestas intento_respuestas_intento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intento_respuestas
    ADD CONSTRAINT intento_respuestas_intento_id_fkey FOREIGN KEY (intento_id) REFERENCES public.intentos(id) ON DELETE CASCADE;


--
-- Name: intento_respuestas intento_respuestas_opcion_seleccionada_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intento_respuestas
    ADD CONSTRAINT intento_respuestas_opcion_seleccionada_id_fkey FOREIGN KEY (opcion_seleccionada_id) REFERENCES public.opciones(id) ON DELETE CASCADE;


--
-- Name: intento_respuestas intento_respuestas_pregunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intento_respuestas
    ADD CONSTRAINT intento_respuestas_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.preguntas(id) ON DELETE CASCADE;


--
-- Name: intentos intentos_examen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intentos
    ADD CONSTRAINT intentos_examen_id_fkey FOREIGN KEY (examen_id) REFERENCES public.examenes(id) ON DELETE CASCADE;


--
-- Name: intentos intentos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.intentos
    ADD CONSTRAINT intentos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: opciones opciones_pregunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.opciones
    ADD CONSTRAINT opciones_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.preguntas(id) ON DELETE CASCADE;


--
-- Name: preguntas preguntas_examen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docentesmart
--

ALTER TABLE ONLY public.preguntas
    ADD CONSTRAINT preguntas_examen_id_fkey FOREIGN KEY (examen_id) REFERENCES public.examenes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict tBgdS1bCXBF26gPHE80IYLF48oFwZgNP0waXAKwSZPVuzS9Ez1pHzt85S78PuHd

