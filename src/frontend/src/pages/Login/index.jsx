import React from 'react';
import { Container, Typography } from '@mui/material'
import { LoginForm } from '../../components';
import PropTypes from 'prop-types';

export default function Login({ setToken }) {
  return (
    <Container maxWidth="md">
      <Typography variant="h2" sx={{ margin: '1em 0em 0.25em 0em' }}>Login</Typography>
      <LoginForm setToken={setToken} />
    </Container>
  );
}

Login.propTypes = {
  setToken: PropTypes.func.isRequired
}