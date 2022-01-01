import React from 'react'
import { styled, alpha } from '@mui/material/styles';
import { Alert, InputBase, Stack, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab'
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

const CustomLoadingButton = styled(LoadingButton)(({ theme }) => ({
  '&:disabled': {
    backgroundColor: alpha(theme.palette.primary.main, 0.25),
  },
  '&:disabled *': {
    color: alpha(theme.palette.primary.main, 1),
  },
}));

async function authenticateUser(credentials, login) {
  let url = `http://localhost:${REACT_APP_BACKEND_PORT}/` + (login ? 'login' : 'register')
  return fetch(url, {
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
  const [loading, setLoading] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleClick = async (e, login) => {
    setLoading(true)
    const res = await authenticateUser({
      username,
      password
    }, login);

    if (res.err) {
      setError(res.err)
      setLoading(false)
    } else {
      setToken(res.token);
    }
    
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
      <CustomLoadingButton onClick={(e) => handleClick(e, true)} loading={loading} variant="contained" size="large" sx={{ margin: '2em 0em', float: 'right' }}>Login</CustomLoadingButton>
      <CustomLoadingButton onClick={(e) => handleClick(e, false)} loading={loading} variant="contained" size="large" sx={{ margin: '2em 1em', float: 'right' }}>Register</CustomLoadingButton>
    </LoginContainer>
  );
}

LoginForm.propTypes = {
  setToken: PropTypes.func.isRequired
}
