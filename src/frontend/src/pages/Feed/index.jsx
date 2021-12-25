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
  },
  {
    username: "antbz",
    timestamp: "1h",
    text: "I would make some Grindr posting here, but this does not support phots.... Very sad mates.... I will come back another time to make your days!"
  },
  {
    username: "g-batalhao-a",
    timestamp: "2h",
    text: "https://www.youtube.com/watch?v=T0A_cm6DIGM"
  },
  {
    username: "my_name_is_cath",
    timestamp: "5h",
    text: "Souto is so baby. I like him so much that I wish he would go on a trip and never come back."
  }
]

export default function Feed() {
  return (
    <Container maxWidth="md">
      <PublishForm/>
      <Divider/>
      <FeedStack data={publications}/>
    </Container>
  );
}