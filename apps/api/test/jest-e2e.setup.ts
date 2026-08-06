// Variaveis minimas para o AppModule compilar em testes e2e sem depender do
// Postgres real: o PrismaService e sobrescrito por um mock em cada spec, mas o
// ConfigModule/JwtModule ainda exigem JWT_SECRET presente para inicializar.
process.env.JWT_SECRET ??= 'test-secret-please-do-not-use-in-production';
process.env.NODE_ENV ??= 'test';
