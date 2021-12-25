import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const theme = createTheme({
  palette: {
    primary: {
      main: '#BAE9FF',
    },
    secondary: {
      main: '#004353',
    },
  },
  typography: {
    fontFamily: [
      'Montserrat',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

