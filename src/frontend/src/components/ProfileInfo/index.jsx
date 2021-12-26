import React from 'react'
import { styled } from '@mui/material/styles';
import { Stack, Typography } from '@mui/material';

const ProfileContainer = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  padding: '3em 0em 1em 0em'
}));

export default function ProfileInfo({ data }) {
  return (
    <ProfileContainer>
      <Stack spacing={2}>
        <Typography variant="h2">{data.username}</Typography>
        <Stack direction="row" spacing={4}>
          <Stack direction="row" spacing={1}>
            <Typography>{data.followers.length}</Typography>
            <Typography variant="button">Followers</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography>{data.following.length}</Typography>
            <Typography variant="button">Following</Typography>
          </Stack>
        </Stack>
      </Stack>
    </ProfileContainer>
  );
}
