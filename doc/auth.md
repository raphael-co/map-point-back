# Documentation des Routes d'Authentification

## 1. Enregistrement d'un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/auth/register`  
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
    "message": "User registered successfully",
    "token": "your_jwt_token"
}
```

---

## 2. Connexion d'un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/auth/login`  
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

---

## 3. Authentification avec Google

**URL**: `https://map-point.netgraph.fr/api/auth/google`  
**Méthode**: POST

**Headers**:  
- Content-Type: application/json

**Corps**:

```json
{
    "token": "google_oauth_token"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "token": "your_jwt_token",
    "user": {
        "id": 123,
        "email": "newuser@example.com",
        "username": "newuser",
        "profilePicture": "profile_image_url"
    }
}
```

---

## 4. Enregistrement en Masse

**URL**: `https://map-point.netgraph.fr/api/auth/bulk-register`  
**Méthode**: POST

**Headers**:  
- Content-Type: application/json

**Corps**:

```json
{
    "users": [
        {
            "username": "user1",
            "emailAddresses": "user1@example.com",
            "password": "SecureP@ssw0rd!",
            "gender": "male"
        },
        {
            "username": "user2",
            "emailAddresses": "user2@example.com",
            "password": "SecureP@ssw0rd!",
            "gender": "female"
        }
    ]
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "2 users registered successfully"
}
```

---

## 5. Demande de Réinitialisation de Mot de Passe

**URL**: `https://map-point.netgraph.fr/api/auth/request-password-reset`  
**Méthode**: POST

**Headers**:  
- Content-Type: application/json

**Corps**:

```json
{
    "email": "newuser@example.com"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Password reset token sent to your email"
}
```

---

## 6. Réinitialisation de Mot de Passe

**URL**: `https://map-point.netgraph.fr/api/auth/reset-password`  
**Méthode**: POST

**Headers**:  
- Content-Type: application/json

**Corps**:

```json
{
    "token": "reset_token",
    "newPassword": "NewSecureP@ssw0rd!",
    "confirmPassword": "NewSecureP@ssw0rd!"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Password reset successfully"
}
```

---

# Explications Générales

1. **Enregistrement d'un Utilisateur**: L'utilisateur fournit des informations comme `username`, `emailAddresses`, `password`, et `gender`. Une réponse de succès est renvoyée avec un jeton JWT.
2. **Connexion d'un Utilisateur**: Nécessite un `emailAddresses` et un `password`. La réponse inclut un jeton JWT.
3. **Google Authentification**: Nécessite un jeton Google OAuth pour connecter un utilisateur via Google.
4. **Enregistrement en Masse**: Permet d'enregistrer plusieurs utilisateurs en une seule requête.
5. **Demande de Réinitialisation de Mot de Passe**: L'utilisateur demande un lien pour réinitialiser son mot de passe, qui est envoyé par email.
6. **Réinitialisation de Mot de Passe**: Réinitialise le mot de passe d'un utilisateur en fonction d'un jeton de réinitialisation.
