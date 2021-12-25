import { styled } from '@mui/material/styles';

const Divider = styled('hr')(({ theme }) => ({
  backgroundColor: theme.palette.secondary.main,
  border: 0,
  height: '3px',
  margin: '1em 0em'
}));

export default Divider;
