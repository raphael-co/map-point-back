# Documentation des Routes des Utilisateurs

Cette documentation décrit les différentes routes utilisées pour gérer les utilisateurs, notamment l'authentification, la mise à jour des informations et la gestion des mots de passe.

## Routes pour les Utilisateurs

### 1. Récupérer les Informations Authentifiées de l'Utilisateur

**URL**: `https://map-point.netgraph.fr/api/users/`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "user": {
        "id": 1,
        "username": "JohnDoe",
        "email": "johndoe@example.com",
        "gender": "male",
        "profile_image_url": "https://cloudinary.com/profile_image",
        "joined_at": "2023-01-01",
        "last_login": "2023-10-01",
        "followers": 10,
        "followings": 15,
        "nbMarkerCount": 5
    }
}
```

---

### 2. Modifier les Informations de l'Utilisateur

**URL**: `https://map-point.netgraph.fr/api/users/edit`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: multipart/form-data

**Corps** (FormData):

- username: Nom d'utilisateur (string)
- gender: Genre (`male`, `female`, `other`)
- profileImage: Image de profil (fichier)

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "User updated successfully",
    "user": {
        "id": 1,
        "username": "JohnDoe",
        "email": "johndoe@example.com",
        "gender": "male",
        "profile_image_url": "https://cloudinary.com/new_profile_image",
        "joined_at": "2023-01-01",
        "last_login": "2023-10-01",
        "followers": 10,
        "followings": 15
    }
}
```

---

### 3. Récupérer Tous les Utilisateurs

**URL**: `https://map-point.netgraph.fr/api/users/all`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "users": [
        {
            "id": 1,
            "username": "JohnDoe",
            "email": "johndoe@example.com",
            "gender": "male"
        },
        {
            "id": 2,
            "username": "JaneDoe",
            "email": "janedoe@example.com",
            "gender": "female"
        }
    ]
}
```

---

### 4. Récupérer Tous les Utilisateurs sauf l'Utilisateur Actuel

**URL**: `https://map-point.netgraph.fr/api/users/all-except-current`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`  
- Query Parameters (facultatif):  
  - username: Nom d'utilisateur (string)
  - email: Adresse e-mail (string)
  - gender: Genre (`male`, `female`, `other`)
  - page: Numéro de la page (par défaut: 1)  
  - limit: Limite par page (par défaut: 10)

**Réponse Possible**:

```json
{
    "status": "success",
    "users": [
        {
            "id": 2,
            "username": "JaneDoe",
            "email": "janedoe@example.com",
            "gender": "female",
            "profile_image_url": "https://cloudinary.com/profile_image_jane"
        }
    ]
}
```

---

### 5. Récupérer un Utilisateur par ID

**URL**: `https://map-point.netgraph.fr/api/users/:id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "user": {
        "id": 2,
        "username": "JaneDoe",
        "email": "janedoe@example.com",
        "gender": "female",
        "profile_image_url": "https://cloudinary.com/profile_image_jane",
        "followers": 5,
        "followings": 3,
        "isFollowing": true,
        "hasRequestedFollow": false,
        "nbMarkerCount": 10
    }
}
```

---

### 6. Changer le Mot de Passe

**URL**: `https://map-point.netgraph.fr/api/users/change-password`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "oldPassword": "AncienMotDePasse",
    "newPassword": "NouveauMotDePasse",
    "confirmPassword": "NouveauMotDePasse"
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Password updated successfully"
}
```

---

### 7. Supprimer un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/users/delete`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "User deleted successfully"
}
```

---

## Explications Générales

1. **Récupérer les Informations Authentifiées** : Cette route permet de récupérer les informations de l'utilisateur connecté, telles que l'email, le genre, les suiveurs, et les suivis.

2. **Modifier les Informations de l'Utilisateur** : Permet de mettre à jour le nom d'utilisateur, le genre, et l'image de profil. Un fichier image peut être téléchargé via `multipart/form-data`.

3. **Récupérer Tous les Utilisateurs** : Retourne la liste de tous les utilisateurs enregistrés dans la base de données.

4. **Récupérer les Utilisateurs sauf l'Utilisateur Actuel** : Cette route retourne la liste de tous les utilisateurs sauf l'utilisateur connecté, avec des options de filtrage basées sur le nom d'utilisateur, l'email, et le genre.

5. **Récupérer un Utilisateur par ID** : Retourne les informations d'un utilisateur spécifique basé sur son ID, incluant les relations de suivi.

6. **Changer le Mot de Passe** : Permet à un utilisateur de changer son mot de passe actuel en fournissant l'ancien et le nouveau mot de passe.

7. **Supprimer un Utilisateur** : Supprime définitivement l'utilisateur connecté de la base de données.