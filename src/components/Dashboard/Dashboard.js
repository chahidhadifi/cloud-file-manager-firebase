import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import FileUpload from '../FileUpload/FileUpload';
import FileList from '../FileList/FileList';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Afficher un spinner pendant le chargement
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </Container>
    );
  }

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <Container>
      <h2 className="mb-4">Tableau de bord</h2>
      <Row>
        <Col md={4}>
          <FileUpload />
        </Col>
        <Col md={8}>
          <FileList />
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;