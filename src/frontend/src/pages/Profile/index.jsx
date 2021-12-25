import React from 'react';
import Container from '@mui/material/Container'
import { Divider, FeedStack, PublishForm } from '../../components';

const publications = [
  {
    username: "pedrojfs17",
    timestamp: "10m",
    text: "I am liking this project so much. I wish I could make distributed facebook as weel since we could put some photos of people."
  },
  {
    username: "pedrojfs17",
    timestamp: "42m",
    text: "Sometimes I think I am going crazy, but no, I am just tired of this bullshit. Please help...."
  }
]

export default function Profile() {
  return (
    <Container maxWidth="md">
      <PublishForm/>
      <Divider/>
      <FeedStack data={publications}/>
    </Container>
  );
}