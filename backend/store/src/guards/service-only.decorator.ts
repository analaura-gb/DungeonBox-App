import { SetMetadata } from '@nestjs/common';

export const SERVICE_ONLY = 'serviceOnly';

// Marca uma rota que so outro backend pode chamar. O JwtAuthGuard passa a
// exigir a claim `svc` no token, que o auth nunca emite: sem ela, o dono do
// token chamaria a rota com o proprio cookie.
export const ServiceOnly = () => SetMetadata(SERVICE_ONLY, true);
