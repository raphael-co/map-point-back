# Documentation des Routes des Notifications

Cette documentation décrit les différentes routes utilisées pour gérer les notifications des utilisateurs sur la plateforme MapPoint. Les routes permettent de récupérer, créer, marquer comme lues ou supprimer des notifications.

## Routes pour les Notifications

### 1. Récupérer toutes les Notifications d'un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/notifications/`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "notifications": [
        {
            "id": 1,
            "senderUserId": 123,
            "type": "follow",
            "content": "Vous avez reçu une demande d'ami",
            "is_read": false,
            "timestamp": "2023-10-01T10:00:00Z",
            "sender_username": "user123",
            "profile_image_url": null
        }
    ],
    "unreadCount": 3
}
```

---

### 2. Créer une Notification

**URL**: `https://map-point.netgraph.fr/api/notifications/`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "receiverUserId": 456,
    "type": "follow",
    "content": "user123 vous suit maintenant."
}
```

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Notification created successfully"
}
```

---

### 3. Marquer une Notification comme Lue

**URL**: `https://map-point.netgraph.fr/api/notifications/:notificationId/read`  
**Méthode**: PATCH  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Notification marked as read"
}
```

---

### 4. Marquer Toutes les Notifications comme Lues

**URL**: `https://map-point.netgraph.fr/api/notifications/read`  
**Méthode**: PATCH  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "All notifications marked as read"
}
```

---

### 5. Supprimer une Notification

**URL**: `https://map-point.netgraph.fr/api/notifications/:notificationId`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "message": "Notification deleted successfully"
}
```

---

## Explications Générales

1. **Récupérer toutes les Notifications** : Cette route permet à un utilisateur de récupérer toutes les notifications reçues, y compris celles non lues, ainsi que le nombre total de notifications non lues.

2. **Créer une Notification** : Cette route est utilisée pour envoyer une notification à un autre utilisateur. Par exemple, lorsqu'un utilisateur envoie une demande d'ami ou suit un autre utilisateur, une notification peut être générée et envoyée.

3. **Marquer une Notification comme Lue** : Cette route permet de marquer une notification spécifique comme lue, ce qui change son statut et la retire de la liste des notifications non lues.

4. **Marquer Toutes les Notifications comme Lues** : Cette route permet de marquer toutes les notifications non lues d'un utilisateur comme lues en une seule opération.

5. **Supprimer une Notification** : Un utilisateur peut supprimer une notification qu'il a reçue en fournissant l'ID de celle-ci. Cette action supprime définitivement la notification de la base de données.

Chaque route nécessite un jeton JWT valide à passer dans le header d'autorisation pour authentifier l'utilisateur.