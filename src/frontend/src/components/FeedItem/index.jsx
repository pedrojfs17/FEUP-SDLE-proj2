import React from 'react'
import { Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom'

export default function FeedItem({ data }) {
  return (
    <Stack spacing={1}>
      <Stack spacing={1} direction="row" >
          <Typography sx={{ fontWeight: 'bold' }} ><Link to={"/profile/" + data.username}>{data.username}</Link></Typography>
          <Typography sx={{ fontWeight: 'light' }} >{data.timestamp}</Typography>
      </Stack>
      <Typography>{data.text}</Typography>
    </Stack>
  );
}