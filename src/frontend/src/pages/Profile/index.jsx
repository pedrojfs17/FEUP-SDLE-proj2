import React from 'react';
import { useParams } from 'react-router-dom'
import axios from "axios";
import { Box, CircularProgress, Container } from '@mui/material'
import { Divider, FeedStack, ProfileInfo, PublishForm } from '../../components';

const { REACT_APP_BACKEND_PORT } = process.env;

const baseURL = `http://localhost:${REACT_APP_BACKEND_PORT}/user/`;

export default function Profile() {
  const { username } = useParams();
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    axios.get(baseURL + username).then((response) => {
      setData(response.data);
    });
  }, [username]);

  if (!data) return (
    <Container maxWidth="md">
      <Box sx={{ margin: '5em', display: 'flex',justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    </Container>
  );

  if (data.err) return (
    <Container maxWidth="md">
      <Box sx={{ margin: '5em', display: 'flex',justifyContent: 'center' }}>
        {data.err}
      </Box>
    </Container>
  );

  return (
    <Container maxWidth="md">
      <ProfileInfo data={data}/>
      {username === "pedrojfs17" && (
        <>
          <Divider/>
          <PublishForm/>
        </>
      )}
      <Divider/>
      <FeedStack data={data}/>
    </Container>
  );
}