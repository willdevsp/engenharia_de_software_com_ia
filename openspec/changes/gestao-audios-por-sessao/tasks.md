## 1. Dependências Nativas e Contrato de Tipos

- [x] 1.1 Instalar `@capacitor/filesystem` (`^7.0.0`) no `package.json`, adicionar a interface `SessionAudioTrack` em `src/types/course.ts` e verificar que a instalação npm conclui sem erros

## 2. Camada de Armazenamento Híbrido (Desktop IndexedDB + Android Filesystem)

- [x] 2.1 Implementar `src/utils/audioStorage.ts` com validação de formatos `.m4a`/`.mp3`, persistência de metadados por `sessionId`, armazenamento de binários via `@capacitor/filesystem` (`Directory.Data` + `Capacitor.convertFileSrc`) no Android e via IndexedDB (`Blob` + `ObjectURL` com cleanup) no Desktop, além de remoção física e salvamento de `lastPositionSeconds`, verificando a compilação TypeScript sem erros

## 3. Interface de Gestão e Player de Áudios na Sessão

- [x] 3.1 Criar o componente `src/components/SessionAudioPanel.tsx` com formulário de cadastro de áudio (`.m4a`/`.mp3` + título opcional), lista selecionável de áudios da sessão com exibição de tamanho em MB e botão de remoção, e player integrado com controles `-15s`, `Play/Pause`, `+15s`, barra de progresso e seletor de velocidade (`1.0x` a `2.0x`), verificando que não há erros de tipo
- [x] 3.2 Integrar `SessionAudioPanel` ao `src/components/ChapterReader.tsx` substituindo o placeholder de áudio da Fase 2 (sem alterar `scripts/build-epub.mjs`) e verificar o build de produção com `npm.cmd run build`

## 4. Sincronização Capacitor Android e Compilação do Novo `.APK`

- [x] 4.1 Sincronizar o plugin `@capacitor/filesystem` e o bundle atualizado com `npx.cmd cap sync android` e compilar o novo instalador `.APK` via Gradle (`gradlew assembleDebug`), verificando a atualização de `dist-android/engenharia-software-ia-modulo-01.apk`
