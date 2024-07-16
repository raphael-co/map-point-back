### Exemple de JSON pour les Routes d'Authentification

Voici les exemples de JSON pour les différentes routes d'authentification.

#### 1. Enregistrement d'un Utilisateur

**URL**: `http://localhost:3000/api/auth/register`

**Méthode**: POST

**Headers**:
- Content-Type: application/json

**Corps**:

```json
{
    "username": "newuser",
    "emailAddresses": "newuser@example.com",
    "password": "SecureP@ssw0rd!",
    "gender": "male"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "User registered successfully"
}
```

#### 2. Connexion d'un Utilisateur

**URL**: `http://localhost:3000/api/auth/login`

**Méthode**: POST

**Headers**:
- Content-Type: application/json

**Corps**:

```json
{
    "emailAddresses": "newuser@example.com",
    "password": "SecureP@ssw0rd!"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "token": "your_jwt_token"
}
```

### Explications

1. **Enregistrement d'un Utilisateur** :
   - **Corps** : Inclut les champs `username`, `emailAddresses`, `password`, et `gender`.
   - **Réponse** : Un message de succès avec le statut `success`.

2. **Connexion d'un Utilisateur** :
   - **Corps** : Inclut les champs `emailAddresses` et `password`.
   - **Réponse** : Un message de succès avec le statut `success` et un jeton JWT (`token`).

Ces JSON fournissent les structures nécessaires pour tester vos différentes routes d'authentification avec des exemples concrets.