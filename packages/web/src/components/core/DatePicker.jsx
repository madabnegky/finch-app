import React from 'react';
import Input from './Input';

const DatePicker = React.forwardRef((props, ref) => {
    return <Input ref={ref} type="date" {...props} />;
});

export default DatePicker;