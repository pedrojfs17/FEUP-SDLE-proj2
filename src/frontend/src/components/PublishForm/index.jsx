import React from 'react'
import { styled, alpha } from '@mui/material/styles';
import { Box, IconButton, InputBase, Typography, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';

const PublishContainer = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  padding: '1em 0em'
}));

const PublishField = styled('div')(({ theme }) => ({
  color: theme.palette.primary.main,
  borderRadius: '25px',
  padding: '1em',
  border: `2px solid ${theme.palette.primary.main}`,
  backgroundColor: alpha(theme.palette.secondary.main, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.secondary.main, 0.25),
  },
  marginLeft: 0,
}));

const PublishInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit'
}));

const PublishTools = styled('div')(({ theme }) => ({
  display: 'flex',
  position: 'absolute',
  right: '0%',
  bottom: '0%',
  padding: '0.5em'
}));

export default function PublishForm() {
  const [text, setText] = React.useState("");

  return (
    <PublishContainer>
      <Stack spacing={1}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Publish</Typography>
        <Box sx={{ position: 'relative' }}>
          <PublishField>
            <PublishInputBase
              multiline
              fullWidth
              rows={4}
              placeholder="What are you thinking of?"
              value={text}
              inputProps={{ maxLength: 150 }}
              onChange={e => setText(e.target.value)}
            />
          </PublishField>
          <PublishTools>
            <p>{text.length} / 150</p>
            <IconButton size="large" color="primary" onClick={() => setText("")}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
            <IconButton size="large" color="primary">
              <SendIcon fontSize="inherit" />
            </IconButton>
          </PublishTools>
        </Box>
      </Stack>
    </PublishContainer>
  );
}
