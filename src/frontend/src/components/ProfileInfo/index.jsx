import React from 'react'
import { styled } from '@mui/material/styles';
import { Button, Stack, Typography } from '@mui/material';
import axios from "axios";
import { FollowerBox } from '..';

const { REACT_APP_BACKEND_PORT } = process.env;

const baseURL = `http://localhost:${REACT_APP_BACKEND_PORT}`;

const ProfileContainer = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  padding: '3em 0em 1em 0em'
}));

export default function ProfileInfo({ data }) {

  const [following, setFolowing] = React.useState(data.isFollowing);

  const handleFollow = async (e) => {
    if (following) {
      axios.post(baseURL+"/unfollow", {username: data.username}).then((response) => {
        setFolowing(response.data.isFollowing);
      });

    } else {
      axios.post(baseURL+"/follow", {username: data.username}).then((response) => {
        setFolowing(response.data.isFollowing);
      });
    }
  }
  return (
    <ProfileContainer>
      <Stack spacing={2}>
      <Stack spacing={2} direction='row' justifyContent='space-between'>
        <Typography variant="h2">{data.username}</Typography>
        {!data.profile &&
          <Stack justifyContent='flex-end'>
            <Button onClick={handleFollow} variant="contained" size="medium">{following ? "Unfollow" : "Follow"}</Button>
          </Stack>
        }
        
      </Stack>
      <Stack direction="row" spacing={4}>
          <Stack direction="row" spacing={1}>
            <FollowerBox list={data.followers} title="Followers"/>
          </Stack>
          <Stack direction="row" spacing={1}>
            <FollowerBox list={data.following} title="Following"/>
          </Stack>
        </Stack>
      </Stack>
    </ProfileContainer>
  );
}
