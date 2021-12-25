import React from 'react'
import { styled } from '@mui/material/styles';
import { Stack } from '@mui/material';
import { FeedItem } from '..';

const FeedContainer = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  padding: '1em 0em'
}));

export default function FeedStack({ data }) {
  return (
    <FeedContainer>
      <Stack spacing={5}>
        {data.map((pub, idx) => (<FeedItem key={idx} data={pub}/>))}
      </Stack>
    </FeedContainer>
  );
}
