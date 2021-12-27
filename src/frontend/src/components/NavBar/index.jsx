import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useNavigate } from 'react-router-dom'

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  color: theme.palette.primary.main,
  borderRadius: '15px',
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '12ch',
      '&:focus': {
        width: '20ch',
      },
    },
  },
}));

const Offset = styled('div')(({ theme }) => theme.mixins.toolbar);

export default function NavBar({ logout }) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigate("/profile/" + search)
      setSearch("")
    }
  }

  return (
    <Box>
      <AppBar position="fixed" color="secondary" sx={{padding: { xs: '1em 1em', lg: '1em 10em' }}}>
        <Toolbar>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' }  }}>
            <Link to="/"><img src="/logo.png" alt="bug" height={48} /></Link>
          </Box>
          <Button size="large" sx={{ fontWeight: 'bold' }}><Link to="/">Feed</Link></Button>
          <Button size="large" sx={{ margin: '0em 2em', fontWeight: 'bold' }}><Link to="/profile/pedrojfs17">Profile</Link></Button>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search Users…"
              value={search}
              onKeyUp={handleKeyDown.bind(this)}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Search>
          <IconButton color="primary" onClick={logout} size="large" sx={{ margin: '0em 1em' }}>
            <LogoutIcon/>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Offset sx={{padding: '1em'}} />
    </Box>
  );
}