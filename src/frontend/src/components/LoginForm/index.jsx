import React from 'react'
import { styled, alpha } from '@mui/material/styles';
import { Alert, Button, InputBase, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const { REACT_APP_BACKEND_PORT } = process.env;

const LoginContainer = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  padding: '1em 0em'
}));

const PublishField = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  borderRadius: '15px',
  padding: '0.5em 1em',
  border: `1px solid ${theme.palette.primary.main}`,
  backgroundColor: alpha(theme.palette.secondary.main, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.secondary.main, 0.25),
  },
  marginLeft: 0,
}));

const PublishInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit'
}));

async function loginUser(credentials) {
  return fetch(`http://localhost:${REACT_APP_BACKEND_PORT}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  })
    .then(data => data.json())
 }

export default function LoginForm({ setToken }) {
  const [error, setError] = React.useState(null);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLogin = async (e) => {
    const res = await loginUser({
      username,
      password
    });

    res.err ? setError(res.err) : setToken(res.token);
  }

  return (
    <LoginContainer>
      <Stack spacing={2}>
        {error && <Alert variant="filled" severity="error">{error}</Alert>}
        <Stack spacing={1}>
          <Typography variant="h6">Username</Typography>
          <PublishField>
            <PublishInputBase
              fullWidth
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </PublishField>
        </Stack>
        <Stack spacing={1}>
          <Typography variant="h6">Password</Typography>
          <PublishField>
            <PublishInputBase
              fullWidth
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </PublishField>
        </Stack>
      </Stack>
      <Button onClick={handleLogin} variant="contained" size="large" sx={{ margin: '2em 0em', float: 'right' }}>Login</Button>
    </LoginContainer>
  );
}

LoginForm.propTypes = {
  setToken: PropTypes.func.isRequired
}
