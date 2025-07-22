# Diário Web do Tutor

[![Status da Implantação](https://vercel.com/button?project-id=SEU_PROJET_ID_VERCEL&button=deploy)]([https://vercel.com/SEU_USUARIO_VERCEL/diario-web-tutor](https://vercel.com/mariorenanofcs-projects/diario-web-tutor))
Um aplicativo web de diário pessoal desenvolvido para o curso de Tutoria Web do professor Mário Renan. Permite registrar reflexões diárias, planejar o dia e visualizar o progresso pessoal.

## ✨ Funcionalidades

* **Registro Diário:** Faça check-ins emocionais, registre desafios, analise reações e declare seus valores.
* **Análise de Sentimento (IA):** Obtenha insights sobre suas emoções através da análise de texto (integrado com a API Gemini).
* **Planejamento Diário:** Utilize a matriz de Eisenhower para priorizar tarefas.
* **Canvas de Microcarreiras:** Ferramenta para planejar seu desenvolvimento de carreira e habilidades.
* **Dashboard de Dados:** Visualize tendências de sentimento e valores mais frequentes ao longo do tempo.
* **Autenticação Segura:** Login via conta Google (Firebase Authentication).
* **Persistência de Dados:** Todos os dados são armazenados de forma segura no Firebase Firestore.

## 🚀 Tecnologias Utilizadas

* **Frontend:** React.js
* **Estilização:** Tailwind CSS
* **Backend como Serviço (BaaS):** Google Firebase (Authentication, Firestore)
* **Inteligência Artificial:** Google Gemini API
* **Implantação:** Vercel

## 🛠️ Configuração e Instalação (Desenvolvimento Local)

Para rodar este projeto em sua máquina local:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/mariorenanofc/diario-web-tutor.git](https://github.com/mariorenanofc/diario-web-tutor.git)
    cd diario-web-tutor
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configurações do Firebase e Google Cloud:**
    * Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).
    * Adicione um aplicativo Web e copie as credenciais de `firebaseConfig`.
    * Habilite a **Authentication** (Google, Anônima).
    * No [Google Cloud Platform](https://console.cloud.google.com/) (certificando-se de que o projeto Firebase correto está selecionado):
        * Configure a **OAuth Consent Screen**.
        * Em **Credentials**, edite o "ID do cliente OAuth 2.0" do tipo "Aplicativo da Web".
        * Adicione `https://SEU_PROJECT_ID.firebaseapp.com/__/auth/handler` e `http://localhost:3000` aos "URIs de redirecionamento autorizados".
    * Habilite a **Firestore Database** e configure as regras de segurança para `allow read, write: if request.auth != null && request.auth.uid == userId;` para seus dados de usuário.
    * Crie uma chave de API para a **Gemini API** em [Google Cloud Platform](https://console.cloud.google.com/) > "APIs & Services" > "Credentials".

4.  **Crie um arquivo `.env` na raiz do projeto** e preencha com suas credenciais:
    ```dotenv
    REACT_APP_FIREBASE_APP_ID='YOUR_FIREBASE_APP_ID'
    REACT_APP_FIREBASE_CONFIG='{"apiKey": "YOUR_API_KEY", "authDomain": "YOUR_AUTH_DOMAIN", "projectId": "YOUR_PROJECT_ID", "storageBucket": "YOUR_STORAGE_BUCKET", "messagingSenderId": "YOUR_MESSAGING_SENDER_ID", "appId": "YOUR_APP_ID", "measurementId": "YOUR_MEASUREMENT_ID"}'
    REACT_APP_INITIAL_AUTH_TOKEN=''
    REACT_APP_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

5.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm start
    ```

O aplicativo estará disponível em `http://localhost:3000`.

## 🌐 Implantação

O projeto está configurado para implantação contínua via [Vercel](https://vercel.com/):

1.  Crie uma conta na Vercel e conecte-a ao seu repositório GitHub.
2.  Importe o repositório `diario-web-tutor`.
3.  Configure as variáveis de ambiente na Vercel (correspondentes ao seu arquivo `.env`).
4.  A Vercel construirá e implantará automaticamente o aplicativo em cada push para o `main` (ou `master`).

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT.

## 📧 Contato

Mário Renan Ferreira Feitosa - [mariovendasonline10k@gmail.com](mariovendasonline10k@gmail.com)
