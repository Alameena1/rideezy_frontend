import React from 'react';
import MainLayout from '../../comp/MainLayout';
import RideFormContainer from '../../../app/features/user/ride/RideFormContainer';

const RideFormPage: React.FC = () => {
  return (
    <MainLayout activeItem="Rides" hideSidebar={true}>
      <RideFormContainer />
    </MainLayout>
  );
};

export default RideFormPage;