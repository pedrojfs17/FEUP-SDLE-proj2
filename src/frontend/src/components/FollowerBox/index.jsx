import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Typography } from '@mui/material';
import { Link } from 'react-router-dom'

export default function FollowerBox({title, list}) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button onClick={handleClickOpen}>{list.length} {title}</Button>
      <Dialog open={open} onClose={handleClose} scroll='paper'>
        <DialogTitle id="alert-dialog-title">
          {title}
        </DialogTitle>
        <DialogContent>
            {list.map((f,idx) => (<Typography onClick={handleClose} key={idx} sx={{ fontWeight: 'bold' }} ><Link to={"/profile/" + f}>{f}</Link></Typography>))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
