import React from 'react';
import axios from "axios";
import { Box, CircularProgress, Container } from '@mui/material'
import { Divider, FeedStack, PublishForm } from '../../components';

const { REACT_APP_BACKEND_PORT } = process.env;

const baseURL = `http://localhost:${REACT_APP_BACKEND_PORT}/feed`;

export default function Feed() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    axios.get(baseURL).then((response) => {
      setData(response.data);
    });
  }, []);

  if (!data) return (
    <Container maxWidth="md">
      <Box sx={{ margin: '5em', display: 'flex',justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    </Container>
  );

  if (data.err) return (
    <Container maxWidth="md">
      {data.err}
    </Container>
  );

  return (
    <Container maxWidth="md">
      <PublishForm/>
      <Divider/>
      <FeedStack data={data}/>
    </Container>
  );
}