import React from 'react'
import { Typography, Stack } from '@mui/material';
import { Link } from 'react-router-dom'
import ReactTimeAgo  from 'react-time-ago'
import TimeAgo from 'javascript-time-ago'

import en from 'javascript-time-ago/locale/en.json'

TimeAgo.addDefaultLocale(en)

export default function FeedItem({ data }) {
  return (
    <Stack spacing={1}>
      <Stack spacing={1} direction="row" >
          <Typography sx={{ fontWeight: 'bold' }} ><Link to={"/profile/" + data.username}>{data.username}</Link></Typography>
          <Typography sx={{ fontWeight: 'light' }} ><ReactTimeAgo date={new Date(data.timestamp)} timeStyle="twitter"/></Typography>
      </Stack>
      <Typography sx={{ wordWrap: 'break-word' }}>{data.text}</Typography>
    </Stack>
  );
}