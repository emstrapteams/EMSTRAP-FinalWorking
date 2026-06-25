from torchvision import models, transforms
from PIL import Image
import torch
import requests
from io import BytesIO

model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)

# Remove classification layer
model = torch.nn.Sequential(*list(model.children())[:-1])
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

def get_embedding_from_url(image_url):
    response = requests.get(image_url)

    image = Image.open(BytesIO(response.content)).convert("RGB")

    image_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        embedding = model(image_tensor)

    embedding = embedding.squeeze().numpy()

    return embedding.tolist()