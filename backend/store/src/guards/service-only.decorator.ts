import { SetMetadata } from '@nestjs/common';

export const SERVICE_ONLY = 'serviceOnly';

export const ServiceOnly = () => SetMetadata(SERVICE_ONLY, true);
