### Exemple de JSON pour les Routes d'Amis

Voici les exemples de JSON pour les différentes routes de gestion des amis.

#### 1. Envoyer une Demande d'Ami

**URL**: `http://localhost:3000/api/friends/send-request`

**Méthode**: POST

**Headers**:
- Authorization: Bearer `your_jwt_token`
- Content-Type: application/json

**Corps**:

```json
{
    "friendId": 2
}
```

#### Réponse Possible:

```json
{
    "status": "success",
    "message": "Friend request sent successfully"
}
```

#### 2. Accepter une Demande d'Ami

**URL**: `http://localhost:3000/api/friends/accept-request`

**Méthode**: POST

**Headers**:
- Authorization: Bearer `your_jwt_token`
- Content-Type: application/json

**Corps**:

```json
{
    "friendId": 2
}
```

#### Réponse Possible:

```json
{
    "status": "success",
    "message": "newuser2 can now see your points"
}
```

#### 3. Rejeter une Demande d'Ami

**URL**: `http://localhost:3000/api/friends/reject-request`

**Méthode**: POST

**Headers**:
- Authorization: Bearer `your_jwt_token`
- Content-Type: application/json

**Corps**:

```json
{
    "friendId": 2
}
```

#### Réponse Possible:

```json
{
    "status": "success",
    "message": "Friend request rejected and deleted"
}
```

#### 4. Lister les Abonnements (Followings)

**URL**: `http://localhost:3000/api/friends/following/:userId`

**Méthode**: GET

**Headers**:
- Authorization: Bearer `your_jwt_token`

**Réponse Possible**:

```json
{
    "status": "success",
    "following": [
        {
            "id": 2,
            "username": "newuser2",
            "email": "newuser2@example.com",
            "gender": "male",
            "joined_at": "2024-07-16T18:11:48.000Z",
            "last_login": "2024-07-16T18:11:48.000Z",
            "followed_at": "2024-07-16T18:31:21.000Z",
            "friend_since": "07/16/2024"
        }
    ]
}
```

#### 5. Lister les Abonnés (Followers)

**URL**: `http://localhost:3000/api/friends/followers/:userId`

**Méthode**: GET

**Headers**:
- Authorization: Bearer `your_jwt_token`

**Réponse Possible**:

```json
{
    "status": "success",
    "followers": [
        {
            "id": 3,
            "username": "followerUser",
            "email": "follower@example.com",
            "gender": "female",
            "joined_at": "2024-07-16T18:12:48.000Z",
            "last_login": "2024-07-16T18:13:48.000Z",
            "followed_at": "2024-07-16T18:32:21.000Z",
            "friend_since": "07/16/2024"
        }
    ]
}
```

#### 6. Lister les Demandes d'Amis en Attente

**URL**: `http://localhost:3000/api/friends/friend-requests`

**Méthode**: GET

**Headers**:
- Authorization: Bearer `your_jwt_token`

**Réponse Possible**:

```json
{
    "status": "success",
    "friendRequests": [
        {
            "id": 4,
            "username": "requestingUser",
            "email": "requestinguser@example.com",
            "gender": "other",
            "joined_at": "2024-07-16T18:14:48.000Z",
            "last_login": "2024-07-16T18:15:48.000Z",
            "requested_at": "2024-07-16T18:33:21.000Z"
        }
    ]
}
```

### Explications

1. **Envoyer une Demande d'Ami**: Utilise l'ID de l'ami à qui la demande est envoyée.
2. **Accepter une Demande d'Ami**: Utilise l'ID de l'ami dont la demande est acceptée.
3. **Rejeter une Demande d'Ami**: Utilise l'ID de l'ami dont la demande est rejetée.
4. **Lister les Abonnements**: Retourne une liste des utilisateurs suivis par l'utilisateur courant avec des détails.
5. **Lister les Abonnés**: Retourne une liste des utilisateurs qui suivent l'utilisateur courant avec des détails.
6. **Lister les Demandes d'Amis**: Retourne une liste des demandes d'amis en attente pour l'utilisateur courant avec des détails.

Ces JSON fournissent les structures nécessaires pour tester vos différentes routes de gestion des amis avec des exemples concrets.